����   0 �	 ! N
 O P Q R
  S
  T
 " S
 U V	 ! W	 X Y 5
 Z [ \
  _
 U `
 a b c
  d e f
  S g
  h
 a i
  j
 A d
 Z k
  d	 ! l m
 ! n
 Z o p q r originalConnection "Ljavax/microedition/io/Connection; acc $Ljava/security/AccessControlContext; >class$org$microemu$microedition$io$ConnectionInvocationHandler Ljava/lang/Class; 	Synthetic <init> &(Ljavax/microedition/io/Connection;Z)V Code LineNumberTable LocalVariableTable this :Lorg/microemu/microedition/io/ConnectionInvocationHandler; con needPrivilegedCalls Z invoke S(Ljava/lang/Object;Ljava/lang/reflect/Method;[Ljava/lang/Object;)Ljava/lang/Object; e )Ljava/security/PrivilegedActionException; -Ljava/lang/reflect/InvocationTargetException; proxy Ljava/lang/Object; method Ljava/lang/reflect/Method; args [Ljava/lang/Object; 
Exceptions s class$ %(Ljava/lang/String;)Ljava/lang/Class; x1 "Ljava/lang/ClassNotFoundException; x0 Ljava/lang/String; 
access$000 ^(Lorg/microemu/microedition/io/ConnectionInvocationHandler;)Ljavax/microedition/io/Connection; <clinit> ()V 
SourceFile  ConnectionInvocationHandler.java $ % t u C  java/lang/ClassNotFoundException java/lang/NoClassDefFoundError + K v w x y z & ' { | 4 } ~  :org/microemu/microedition/io/ConnectionInvocationHandler$1   InnerClasses + � � � � 5 � 'java/security/PrivilegedActionException � � +java/lang/reflect/InvocationTargetException java/lang/StringBuffer Connection. � � � � � � � � ( ) 8org.microemu.microedition.io.ConnectionInvocationHandler B C � � 8org/microemu/microedition/io/ConnectionInvocationHandler java/lang/Object #java/lang/reflect/InvocationHandler java/lang/Throwable java/lang/Class forName 	initCause ,(Ljava/lang/Throwable;)Ljava/lang/Throwable; java/security/AccessController 
getContext &()Ljava/security/AccessControlContext; *org/microemu/microedition/io/ConnectorImpl debugConnectionInvocations org/microemu/log/Logger debug '(Ljava/lang/String;Ljava/lang/Object;)V j(Lorg/microemu/microedition/io/ConnectionInvocationHandler;Ljava/lang/reflect/Method;[Ljava/lang/Object;)V doPrivileged a(Ljava/security/PrivilegedExceptionAction;Ljava/security/AccessControlContext;)Ljava/lang/Object; java/lang/reflect/Method 9(Ljava/lang/Object;[Ljava/lang/Object;)Ljava/lang/Object; getCause ()Ljava/lang/Throwable; append ,(Ljava/lang/String;)Ljava/lang/StringBuffer; getName ()Ljava/lang/String; toString error *(Ljava/lang/String;Ljava/lang/Throwable;)V addLogOrigin (Ljava/lang/Class;)V ! ! "  #   $ %    & '    ( )  *       + ,  -   c     *� *+� � 
*� � 	�    .       ;  < 	 =  >  @ /         0 1      2 %     3 4   5 6  -  ~     ² 
� 	,� *� 	� � Y*,-� *� 	� �,*� -� �:� � � 3� 
� $� Y� � ,� � � � � � � � �� 
� !� Y� � ,� � � � � � �:� 
� !� Y� � ,� � � � � � �   $ /  % . /   $ �  % . �   .   F    F  G  J  K % Q / S 1 T < U B V c X l Z r [ � ] � _ � ` � a � c /   >  1 e 7 8  � * 7 9    � 0 1     � : ;    � < =    � > ?  @     A  B C  -   N     *� �L� Y� +� �        .       8 /       D E     F G   *      H I  -   /     *� �    .       0 /        F 1   *      J K  -   5      � � � Y� � � �  �    .   
    8  9  L    M ^   
        