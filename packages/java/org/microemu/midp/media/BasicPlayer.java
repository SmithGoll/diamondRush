����   0 p
  O P
  O
  Q
  R
  S
  T
  U
  V W X W Y Z
  [	  \	  ]	  ^	  _ `	  a b c d CONTROL_TYPE Ljava/lang/String; state I 	loopCount timeBase "Lorg/microemu/midp/media/TimeBase; listenersVector Ljava/util/Vector; <init> ()V Code LineNumberTable LocalVariableTable this %Lorg/microemu/midp/media/BasicPlayer; addPlayerListener ,(Ljavax/microedition/media/PlayerListener;)V playerListener )Ljavax/microedition/media/PlayerListener; removePlayerListener listener enumeration Ljava/util/Enumeration; getState ()I setState (I)V getDuration ()J getMediaTime getTimeBase $()Lorg/microemu/midp/media/TimeBase; setTimeBase %(Lorg/microemu/midp/media/TimeBase;)V 
deallocate prefetch 
Exceptions e realize setLoopCount count getLoopCount setMediaTime (J)J now J getListenersVector ()Ljava/util/Vector; setListenersVector (Ljava/util/Vector;)V start stop <clinit> 
SourceFile BasicPlayer.java   ! java/util/Vector H I ? 2 1 2 F G f g h i j k l m n 'javax/microedition/media/PlayerListener o g         ToneControl   #org/microemu/midp/media/BasicPlayer java/lang/Object javax/microedition/media/Player 'javax/microedition/media/MediaException add (Ljava/lang/Object;)Z elements ()Ljava/util/Enumeration; java/util/Enumeration hasMoreElements ()Z nextElement ()Ljava/lang/Object; remove!      	                             !  "   U     *� *� Y� � *� *d� �    #       -  .  /  0  1 $        % &   ! ' (  "   B     
*� +� W�    #   
    5 	 6 $       
 % &     
 ) *   + (  "   �     0*� � 	M,� 
 � !,�  � N-+� *� -� W� ��ܱ    #   "    :  ;  =  >   @ ) A , C / D $   *    , *    0 % &     0 ) *   ( - .   / 0  "   /     *� �    #       H $        % &   ! 1 2  "   >     *� �    #   
    M  N $        % &          3 4  "   ,     	�    #       R $        % &    5 4  "   ,     	�    #       W $        % &    6 7  "   /     *� �    #       \ $        % &   ! 8 9  "   >     *+� �    #   
    a  b $        % &          : !  "   +      �    #       f $        % &    ; !  "   +      �    #       j $        % &   <     =  > !  "   +      �    #       n $        % &   <     = ! ? 2  "   >     *� �    #   
    r  s $        % &      @    A 0  "   /     *� �    #       w $        % &   ! B C  "   6     	�    #       | $        % &      D E  <     =  F G  "   /     *� �    #       � $        % &   $ H I  "   >     *+� �    #   
    �  � $        % &         ! J !  "   6     *�� �    #   
    �  � $        % &   <     = ! K !  "   6     *,� �    #   
    �  � $        % &   <     =  L !  "         � �    #       #  M    N